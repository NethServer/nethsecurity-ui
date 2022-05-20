#!/bin/sh

api_port=${API_PORT:-5000}

FLASK_RUN_PORT=$api_port FLASK_APP=/api flask run
