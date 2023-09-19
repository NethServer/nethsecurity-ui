# nethsecurity-ui

This repository contains user interface for [NethSecurity](https://github.com/NethServer/nethsecurity) and [NethSecurity Controller](https://github.com/NethServer/nethsecurity-controller).

Purpose of each interface:

- **Standalone**: it's provided when connecting to a NethSecurity unit
- **Controller**: allows you to manage multiple NethSecurity units

## Contributing

See [the contributing guide](CONTRIBUTING.md) for detailed instruction on how to get started.

Contributing it's not a matter of coding, please feel free to open issues or discussions if you need anything! Please be aware that off-topic conversations will be closed.

### Build

To run a build, it's not suggested to run `npm run build` inside the development instance. Instead, a containerized build is provided to ease this process, this will only need `podman` to be installed.

You can just execute:

```bash
./build.sh
```

and that's all you need, if build passes you'll find the build in `./dist`, placed inside the root directory of the project.

Alternatively, you can fetch the latests builds from the "Artifacts" section of the [GitHub builds](https://github.com/NethServer/nethsecurity-ui/actions/workflows/build.yml).

## License

All the repo is licensed under [GPL 3.0 or later](LICENSE) license.
