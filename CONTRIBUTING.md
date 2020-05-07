Contributing
============

Thanks for contributing!

## Development

```sh
$ yarn run check
```

Before opening a PR make sure to run:

```sh
$ yarn build
```

and commit relevant changes (like TOC updates to `.md` docs).

## Releasing a new version to NPM

_Only for project administrators_.

1. Update `CHANGELOG.md`, following format for previous versions
2. Commit as "Changes for version VERSION"
3. Run `npm version patch` (or `minor|major|VERSION`) to run tests and lint,
   build published directories, then update `package.json` + add a git tag.
4. Run `npm publish` and publish to NPM if all is well.
5. Run `git push && git push --tags`
