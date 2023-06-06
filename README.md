# nethsecurity-ui

User interface for [NethSecurity](https://github.com/NethServer/nethsecurity) and [NethSecurity Controller](https://github.com/NethServer/nethsecurity-controller).

This repository includes two user interfaces:

- **Standalone**: the UI of a NethSecurity unit
- **Controller**: the UI of NethSecurity Controller that allows you to manage multiple NethSecurity units

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin).

## Development and building

Follow the steps below to prepare the development environment:

- Install NethSecurity on a development machine
- If you need to code Controller UI install and configure [NethSecurity Controller](https://github.com/NethServer/nethsecurity-controller)
- Create a copy of `.env.development.sample` and rename your copy to `.env.development`
- Edit `.env.development`:
  - If you need to code the Standalone UI:
    - Set `VITE_STANDALONE_API_ENDPOINT` to the IP address or hostname of your NethSecurity
    - Set `VITE_UI_MODE` to `"standalone"`
  - If you need to code the Controller UI:
    - Set `VITE_CONTROLLER_API_ENDPOINT` to the IP address or hostname of your NethSecurity Controller
    - Set `VITE_UI_MODE` to `"controller"`

You can develop and build [inside a container (recommended)](#develop-and-build-inside-a-container) or [on your workstation](#develop-and-build-on-your-workstation).

### Develop and build inside a container

You have two options:

- [Build and start a Podman container](#build-and-start-a-podman-container), or
- [Use VSCode Dev Containers](#use-vscode-dev-containers)

#### Build and start a Podman container

Build the container defined by `Containerfile`:

```
podman build -t nethsecurity-ui .
```

Start development server (`--network=host` is required for hot-reload):

```
podman run -ti -v $(pwd):/app:Z --network=host --name nethsec-ui --replace nethsecurity-ui dev
```

Compiles and minifies for production:

```
podman run -ti -v $(pwd):/app:Z --network=host --name nethsec-ui --replace nethsecurity-ui build
```

#### Use VSCode Dev Containers

- Install VSCode extension [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) (beware: this procedure may not work on [VSCodium](https://vscodium.com/))
- Dev Containers uses Docker by default but you can configure it to use Podman: go to `File > Preferences > Settings`, search `dev containers docker path` and type `podman` as `Docker path`
- Open `nethsecurity-ui` directory (the repository root) in VSCode, if you haven't already
- Open Command Palette (`CTRL+SHIFT+P`) and type `Reopen in Container` (or `Rebuild and Reopen in Container`, if needed)
- Open VSCode integrated terminal: `View > Terminal`
- Enter one of the following commands:
  - `npm install`: project setup
  - `npm run dev`: start development server with hot-reload
  - `npm run build`: compiles and minifies for production. Build output is put inside `dist` directory

Container configuration is contained inside `.devcontainer/devcontainer.json`.

### Develop and build on your workstation

Developing inside a container is the recommended way, but if you want to do it on your workstation:

- Install Node.js (LTS version, currently v18) and npm
- Run a web server on your workstation (hot reloading enabled):
  - `npm install`: project setup
  - `npm run dev`: start development server with hot-reload
  - `npm run build`: compiles and minifies for production. Build output is put inside `dist` directory
