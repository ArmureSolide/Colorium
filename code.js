const COLOR_TYPE = "COLOR";
const FILE_NAME = "colors.txt"

function rgbaToARGB(rgba) {
  const a = Math.round(rgba.a * 255);
  const r = Math.round(rgba.r * 255);
  const g = Math.round(rgba.g * 255);
  const b = Math.round(rgba.b * 255);

  const hex = component => component.toString(16).padStart(2, '0');

  return `${hex(a)}${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
}

async function getColorValue(variable, mode) {
    let value = variable.valuesByMode[mode.modeId];

    if (value.type == "VARIABLE_ALIAS") {
        let variableAlias = await figma.variables.getVariableByIdAsync(value.id);
        let collection = await figma.variables.getVariableCollectionByIdAsync(variableAlias.variableCollectionId);
        let modeAlias = collection.modes[0];

        return getColorValue(variableAlias, modeAlias);
    } else {
        return rgbaToARGB(value);
    }
}

function formatModeName(name) {
  return name
    .replace(/[^\p{L}\p{N}\s/_-]+/gu, '')
    .replace(/[/\-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, c => c.toUpperCase());
}

function formatVariableName(name, suffix) {
  return name
    .replace(/[^\p{L}\p{N}\s/_-]+/gu, '')
    .replace(/[/\-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, c => c.toLowerCase())
    .concat(suffix);
}

function saveToFile(filename, content) {
    figma.ui.postMessage({
        type: 'download',
        filename: filename,
        content: content
    });
}

async function run() {
    try {
        let accumulator = ""
        let colorAccumulator = ""

        const collections = await figma.variables.getLocalVariableCollectionsAsync();

        for (const it of collections) {
            let modes = it.modes;

            for (const variableId of it.variableIds) {
               let variable = await figma.variables.getVariableByIdAsync(variableId);

               if (variable.resolvedType == COLOR_TYPE) {
                    for (const [index, mode] of modes.entries()) {
                        var suffix = ""
                        if (index > 0) {
                            suffix = formatModeName(mode.name);
                        }

                        let name = formatVariableName(variable.name, suffix);
                        let colorValue = await getColorValue(variable, mode);

                        colorAccumulator += `${name} = #${colorValue}\n`;
                    }
               }
            }

            if (colorAccumulator != "") {
                accumulator += `# ${it.name}\n`;
                accumulator += colorAccumulator;
                accumulator += `\n`;

                colorAccumulator = "";
            }
        }

        console.log(accumulator)

        figma.notify(`File ${FILE_NAME} successfully generated.`);
        saveToFile(FILE_NAME, accumulator);
    } catch (err) {
        console.error(err.message);
        console.error(err.stack);
        figma.notify(`Error while generating ${FILE_NAME} - ${err.message}`);
        figma.closePlugin();
    }
}

figma.showUI(__html__, { visible: false });

figma.ui.onmessage = (message) => {
    if (message != "success") {
        console.log(message);
    }

    figma.closePlugin();
};

run();

