import React from 'react';

type LinkTreeProps = {
  url: string,
  useTor: boolean
};

type NodeChildren = Array<LinkNode>;

type LinkNode = {
  name: string,
  children: NodeChildren 
};

type LinkTreeState = {
  root: LinkNode 
};

export default class LinkTree extends React.Component<LinkTreeProps, LinkTreeState> {
  constructor(props: LinkTreeProps) {
    super(props);
    this.state = {root: {name: props.url, children: []}}
  }

  render() {
    return {};
  }

}
