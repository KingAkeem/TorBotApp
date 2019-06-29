type OriginRequest = XMLHttpRequest & {origin: string};

const newOriginRequest = (origin: string): OriginRequest => {
    return Object.assign(new XMLHttpRequest(), { origin });
}