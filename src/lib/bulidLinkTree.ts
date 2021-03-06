import isValidUrl from './isValidUrl';
import Request from './Request';
import parseLinks from './parseLinks';

export type LinkNode = {
  name: string,
  children: LinkNode[] 
};

const getNodeChildren = async (link: string, tor: boolean, depth: number): Promise<LinkNode[]> => {
  if (!isValidUrl(link)) return [];
  let response;
  let req = new Request();
  try {
    response = await req.get({url: link, tor: tor});
  } catch(err) {
    console.error(err);
    return;
  } 
  const links = parseLinks(response.body);
  if (!links) return;
  const children: LinkNode[] = new Array(links.length);
  for (let i = 0; i < links.length; i++) {
    let node: LinkNode;
    if (depth <= 1 || !depth) {
      node = { name: links[i], children: [] };
    } else {
      const c = await getNodeChildren(links[i], tor, depth - 1);
      node = { name: links[i], children: c}  
    }
    children[i] = node;
  }
  return children;
}

type LinkTreeParams = {
  tor?: boolean
  depth?: number
};

export default async (rootLink: string, params: LinkTreeParams): Promise<LinkNode | null> => {
  if (!isValidUrl(rootLink)) return null; 
  const nodeChildren = await getNodeChildren(rootLink, params.tor, params.depth);
  return {name: rootLink, children: nodeChildren};
}