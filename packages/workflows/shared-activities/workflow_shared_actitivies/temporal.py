from workflow_shared_actitivies.activity_meta import TemporalActivityMeta
from workflow_shared_actitivies.send_event import SendEventActivity
from workflow_shared_actitivies.update_file_status import UpdateFileStatusActivity


class SendEventActivityTemporal(SendEventActivity, metaclass=TemporalActivityMeta): ...


class UpdateFileStatusActivityTemporal(
    UpdateFileStatusActivity, metaclass=TemporalActivityMeta
): ...
