#!/bin/bash

cd "$(dirname "$0")"

TF_VERSION=1.5.7
TF_CHDIR=.tf

# Add the localstack cloud domain to the hosts file
# echo "127.0.0.1     s3.localhost.localstack.cloud" >> /etc/hosts

if command -v terraform > /dev/null; then
    echo "terraform is already installed"
else
    echo "Installing terraform"
    apt-get update && apt-get install -y git

    git clone https://github.com/tfutils/tfenv.git ~/.tfenv

    ln -s ~/.tfenv/bin/* /usr/local/bin

    tfenv install $TF_VERSION
    tfenv use $TF_VERSION
fi

if command -v tflocal > /dev/null; then
    echo "tflocal is already installed"
else
    echo "Installing tflocal"
    # TODO: Update to the version 0.21.0 when it's released.
    pip install git+https://github.com/localstack/terraform-local.git@5493d6c42b37b4e5d6e74a8aa0639dfe1bfeb75f
fi

# Listing all providers.tf files in root-tf and adding them to the ADDITIONAL_TF_OVERRIDE_LOCATIONS environment variable
export ADDITIONAL_TF_OVERRIDE_LOCATIONS=$(find root-tf -name providers.tf | while read file; do
    echo -n "$(pwd)/$(dirname "$file"),"
done | sed 's/,$//')

export S3_HOSTNAME=localhost

tflocal -chdir=$TF_CHDIR init

tflocal -chdir=$TF_CHDIR apply -auto-approve

tflocal -chdir=$TF_CHDIR output 2>&1 | tee output_values.txt
