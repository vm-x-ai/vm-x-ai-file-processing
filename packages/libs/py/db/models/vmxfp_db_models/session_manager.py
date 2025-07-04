import json
import socket
import subprocess
import time
from datetime import datetime

import botocore
import botocore.client


class SessionManager:
    """
    AWS Session Manager context manager

    This context manager starts a session using the AWS Session Manager plugin,
    opens a port forwarding tunnel, and terminates the session when the \
        context manager exits.

    Args:
        client: boto3 client
        check_connection: check if the port forwarding tunnel is established
        timeout: timeout in seconds for checking the connection
        **kwargs: keyword arguments for start_session

    Returns: session dictionary
    """

    def __init__(
        self,
        client: botocore.client.BaseClient,
        check_connection: bool = True,
        timeout: int = 60,
        **kwargs,
    ):
        """Initialize the context manager."""
        self.client = client
        self.kwargs = kwargs
        self.check_connection = check_connection
        self.timeout = timeout

    def __enter__(self):
        """Start the session and open the port forwarding tunnel."""
        self.session = self.client.start_session(**self.kwargs)
        try:
            try:
                self.session_maneger_plugin_process = subprocess.Popen(
                    (
                        "session-manager-plugin",
                        json.dumps(self.session),
                        self.client.meta.region_name,
                        "StartSession",
                        "",
                        json.dumps(self.kwargs),
                        self.client.meta.endpoint_url,
                    ),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    stdin=subprocess.DEVNULL,
                )
            except FileNotFoundError as err:
                raise FileNotFoundError(
                    "The AWS session_manager_plugin is required."
                ) from err

            if self.check_connection:
                try:
                    port_number = int(self.kwargs["Parameters"]["localPortNumber"][0])
                except KeyError:
                    pass

                else:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    addr = ("127.0.0.1", port_number)
                    start_at = datetime.now().timestamp()
                    host = self.kwargs["Parameters"]["host"][0]
                    host_port = self.kwargs["Parameters"]["portNumber"][0]
                    print(
                        f"Waiting for connection to {host}:{host_port} "
                        f"to localhost:{port_number}..."
                    )

                    while datetime.now().timestamp() - start_at < self.timeout:
                        if sock.connect_ex(addr) == 0:
                            sock.close()
                            break
                        time.sleep(0.25)
                        continue
                    else:
                        raise TimeoutError(
                            f"Unable to connect to {port_number} using session manager."
                        )

            return self.session
        except:
            self.client.terminate_session(SessionId=self.session["SessionId"])
            raise

    def __exit__(self, exc_type, exc_value, traceback):
        """Terminate the session."""
        self.client.terminate_session(SessionId=self.session["SessionId"])

        if self.session_maneger_plugin_process:
            self.session_maneger_plugin_process.kill()
