#!/bin/bash

[ ! -d '/tmp/cache' ] && mkdir -p /tmp/cache

HOSTNAME=0.0.0.0 exec node packages/apps/ui/server.js

