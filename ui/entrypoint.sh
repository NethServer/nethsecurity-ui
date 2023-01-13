#!/bin/sh

ui_port=${UI_PORT:-3000}
ui_bind=${UI_BIND_IP:-0.0.0.0}

exec 3>&1
chown lighttpd:lighttpd /dev/fd/3

cat <<EOF > /etc/lighttpd/lighttpd.conf
var.basedir  = "/var/www/localhost"
var.logdir   = "/var/log/lighttpd"
var.statedir = "/var/lib/lighttpd"
server.modules = (
    "mod_access",
    "mod_accesslog"
)
include "mime-types.conf"
server.bind          = "${ui_bind}"
server.port          = ${ui_port}
server.username      = "lighttpd"
server.groupname     = "lighttpd"
server.document-root = var.basedir + "/htdocs"
server.pid-file      = "/run/lighttpd.pid"
server.indexfiles    = ("index.php", "index.html",
						"index.htm", "default.htm")
server.follow-symlink = "enable"
static-file.exclude-extensions = (".php", ".pl", ".cgi", ".fcgi")
url.access-deny = ("~", ".inc")
EOF

lighttpd -D -f /etc/lighttpd/lighttpd.conf
