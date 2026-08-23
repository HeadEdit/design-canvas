import type { NodeDefinition, NodePort } from '../domain/node-definitions';

function freezePort(port: NodePort): NodePort {
  return Object.freeze({
    id: port.id,
    label: port.label,
    type: port.type,
    ...(port.optional === undefined ? {} : { optional: port.optional }),
  });
}

export function freezeDefinition(definition: NodeDefinition): NodeDefinition {
  return Object.freeze({
    ...definition,
    inputs: Object.freeze(definition.inputs.map(freezePort)),
    outputs: Object.freeze(definition.outputs.map(freezePort)),
    defaultConfig: Object.freeze(structuredClone(definition.defaultConfig)),
  });
}
