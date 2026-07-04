cd packages/kilo-vscode && bun run package
cd packages/kilo-vscode && bun run prepare:cli-binary && bunx vsce package --no-dependencies -o ../../packages/kilo-vscode/out/kilo.vsix