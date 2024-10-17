# Welcome to the contributing guide

Thank you for investing time in contributing!

Here you'll get an overview of the contribution workflow: from opening an issue, creating a PR and merging it.

## New contributor

For an overview, please read the [README](README.md), then below you find some resources to get started:

- [Set up Git](https://docs.github.com/en/get-started/quickstart/set-up-git)
- [GitHub flow](https://docs.github.com/en/get-started/quickstart/github-flow)
- [Collaborating with pull requests](https://docs.github.com/en/github/collaborating-with-pull-requests)

## Getting started

The project is a typescript [Vue.js](https://vuejs.org/guide/introduction.html) built
with [vite](https://vitejs.dev/guide/).

Additional components are listed below:

- Build
  - [Podman](https://podman.io/docs) for building and run containerized development instances
  - [GitHub Actions](https://docs.github.com/en/actions) performs checks and builds the UI
- Styling:
  - [TailwindCSS](https://tailwindcss.com/docs/installation)
  - [Nethesis Font-Awesome](https://github.com/Nethesis/Font-Awesome) contains free Font-Awesome and additional custom
    icons
- Frontend:
  - [lodash](https://lodash.com/docs/4.17.15) general helpers
  - [axios](https://axios-http.com/docs/intro) for HTTPs calls to the api-server
  - [chart.js](https://www.chartjs.org/docs/latest/) various charts displayed throughout the application
  - [pinia](https://pinia.vuejs.org/introduction.html) state handling and management
  - [vue-i18n](https://vue-i18n.intlify.dev/guide/introduction.html) localization
- Linting:
  - [husky](https://typicode.github.io/husky/) commit hooks
  - [commitlint](https://commitlint.js.org/#/) linting commit messages
  - [prettier](https://prettier.io/docs/en/) prettify the code
  - [eslint](https://eslint.org/docs/latest/use/getting-started) catches issues before they happen, also enforces code
    standards

## Development and building

Follow the steps below to prepare the development environment:

- Install NethSecurity on a development machine and
  follow [the steps to disable CORS](https://nethserver.github.io/nethsecurity/packages/ns-ui/#ui-development)
- If you need to code Controller UI install and
  configure [NethSecurity Controller](https://github.com/NethServer/nethsecurity-controller)
- Create a copy of `.env.development.sample` and rename your copy to `.env.development`
- Edit `.env.development`:
  - If you need to code the Standalone UI:
    - Set `VITE_STANDALONE_API_HOST` to the IP address or hostname of your NethSecurity
    - Set `VITE_UI_MODE` to `"standalone"`
  - If you need to code the Controller UI:
    - Set `VITE_CONTROLLER_API_HOST` to the IP address or hostname of your NethSecurity Controller
    - Set `VITE_UI_MODE` to `"controller"`

You can develop and build [inside a container (recommended)](#develop-inside-a-container)
or [on your workstation](#develop-on-bare-bone).

### Commit notations

To enforce understandable and linear commits,
the [conventional commits specification v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) is used.

On every `npm install` a `commit-msg` hook that checks the contents of the commit is installed. However, if a `trash`
commit or a `wip` commit needs to be provided, feel free to skip the checks with this additional `git-commit`
flag: `--no-verify`

### Code style

The project uses [prettier](https://prettier.io) to enforce code style in tandem with [eslint](https://eslint.org). To format all files automatically, you can run:

```bash
./dev.sh npm run format
```

while to check for linting errors (and automatically fix them if possible) you can run:

```bash
./dev.sh npm run lint
```

this will prevent issues when proposing a PR.

### Develop inside a container

You have two options:

- [Podman development container](#podman-development-container)
- [Use VSCode Dev Containers](#use-vscode-dev-containers)

#### Podman development container

This allows you to have a running instance of the container without tying yourself to any IDE/Editor.

To start the development container, you can just

```bash
./dev.sh
```

this command will build the required image, install node dependencies and run a development server on `localhost:5173`.

However, `dev.sh` can be used to do even more, for example you can force to rebuild the image with

```bash
dev.sh build
```

or you can run every command you need directly inside the container, for example:

```bash
# add a new package to the project
dev.sh npm add -D "some cool package"
# or just get inside the container with
dev.sh bash
```

#### Use VSCode Dev Containers

This comes with a caveat due to the change of the `dev.containers.dockerPath` configuration which is **GLOBAL**. This
will affect you if you work on any other project using VSCode and DevContainers.

However, the process is fully automated and gets you running with all the extensions already set up correctly.

- Install VSCode
  extension [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) (
  beware: this procedure may not work on [VSCodium](https://vscodium.com/))
- Dev Containers uses Docker by default, but you can configure it to use Podman: go to `File > Preferences > Settings`,
  search `dev.containers.dockerPath` and type `podman` as `Docker path`
- Open `nethsecurity-ui` directory (the repository root) in VSCode, if you haven't already
- Open Command Palette (`CTRL+SHIFT+P`) and type `Reopen in Container` (or `Rebuild and Reopen in Container`, if needed)
- Open VSCode integrated terminal: `View > Terminal`
- Enter one of the following commands:
  - `npm install`: install dependencies
  - `npm run dev`: start development server with hot-reload

Container configuration is contained inside `.devcontainer/devcontainer.json`.

### Develop on bare bone

Developing inside a container is the recommended way, but if you want to do it on your workstation:

- Install Node.js (LTS version, currently v20) and npm
- Run a web server on your workstation (hot reloading enabled):
  - `npm install`: project setup
  - `npm run dev`: start development server with hot-reload
