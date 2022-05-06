#!/bin/sh

exec 3>&1
chown lighttpd:lighttpd /dev/fd/3
lighttpd -D -f /etc/lighttpd/lighttpd.conf
