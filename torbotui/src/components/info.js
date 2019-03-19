import React from 'react';

class Info extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            info: props.info,
        };
    }

    render() {
        return (
            <React.Fragment>
                <h1>INFO</h1>
                    {
                        Object.keys(this.state.info).map((key, i) => {
                            return <li key={i}>{key}: {this.state.info[key]}</li>;
                        })
                    }
            </React.Fragment>
        );
    }
}

export default Info;
