export default (html: string) => {
    const parser = new DOMParser();
    const dom = parser.parseFromString(html, 'text/html');
    const tags = dom.getElementsByTagName('a');
    const links = new Array();
    for (let i = 0; i < tags.length; i++) {
        const item = tags.item(i);
        const attrs = item.attributes;
        for (let j = 0; j < attrs.length; j++) {
            if (attrs[j].nodeName === 'href') {
                const link = attrs[j].nodeValue;
                links.push(link);
            }
        }
    }
    return links;
};
