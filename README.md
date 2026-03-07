Correct Trilium text notes with Antidote.

## Installation

### Antidote API JS

`@druide-informatique/antidote-api-js` can be found at [jsdelivr](https://www.jsdelivr.com/package/npm/@druide-informatique/antidote-api-js?path=dist). However, it cannot be used directly in Trilium. The script should be converted to CommonJS module first. This can be done using RollUp.

1.  Download the `index.min.js` from [jsdelivr](https://www.jsdelivr.com/package/npm/@druide-informatique/antidote-api-js?path=dist).
2.  Use the following command to convert to CommonJS module

```
npx rollup index.min.js --file antidote.js --format cjs
```

### Import the Scripts

1.  Copy the content of `widget.js` and paste into a JSX note in Trilium. Under this note,
2.  Create a child code note (select `JS frontend`, paste the contents of `utils.js`.
3.  Import `antidote.js` under `widget.js`
4.  Create a CSS note and paste the content of `widget.css` into it.

After reloading the front-end, you will be able to see a button at the bottom right for text notes.

## Limitation

This extension uses the local Connectix rather than Antidote Web. To connect to Connectix, we need to know the port first. However, the port is not fixed once Connectix has started. We need to manually tell the extension of the port.

To do this, you need to add `#antidotePort=<port number>` to a note (any note). This port number can be obtained using the following command:

```
./AgentConnectixConsole --api
```

Output should be looking like below:

```plain
{"port":49156}
```

In this case, you should add `#antidotePort=49156`.
