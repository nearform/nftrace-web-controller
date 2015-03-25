##Nftrace-web-controller
--------------------

To use:

Clone this repo.

Do an NPM install in this repo.

Run the server with ``node app.js``

This allows you to create and view sessions for lttng. It will list running processes' and their tracepoints, and all kernel tracepoints. you can enable tracepoints on a per pid basis. You can also enable events for processes' which may not have started yet, but they will still be picked up.

This is built using express and socket.io, with handlebars for views.