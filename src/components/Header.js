import React from 'react';
import { Menu } from 'semantic-ui-react';
import { Link } from 'react-router-dom';

export default () => {
    return (
        <Menu stackable style={{ marginTop: '10px' }}>
            <Menu.Item as={Link} to='/'>
                Micropayment Channel with Ethereum
            </Menu.Item>
            <Menu.Menu position="right">
                <Menu.Item as={Link} to='/'>
                    Channels
                </Menu.Item>
                <Menu.Item as={Link} to='/deliveries/new'>
                    +
                </Menu.Item>
            </Menu.Menu>
        </Menu>
    );
};