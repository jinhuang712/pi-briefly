# pi-briefly

Configurable, native-first tool presentation for Pi.

## Modes

```text
visible  compact  collapse  hidden
```

Presets are fixed. `collapse` keeps native tool rendering during the run, then hides the settled tool rows and appends one aggregate run summary after the final response.

## Command

```text
/briefly
/briefly show
/briefly reload
/briefly reset
```

Configuration files:

- `~/.pi/agent/pi-briefly.json`
- `.pi/pi-briefly.json`

Install from GitHub:

```bash
pi install git:github.com/jinhuang712/pi-briefly
```

See [specs/README.md](specs/README.md) for the full specification and implementation plan.

## Development

```bash
npm test
PI_OFFLINE=1 pi --no-session --no-approve \
  --extension .pi/extensions/pi-briefly.ts \
  --tools bash,read,write,edit,find,grep,ls \
  --mode json -p 'Run the tool smoke test and stop.'
```
