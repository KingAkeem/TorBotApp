type OriginRequest = XMLHttpRequest & {origin: string};

const newOriginRequest = (origin: string) => Object.assign(new XMLHttpRequest(), { origin });