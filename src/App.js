import React, { Component } from 'react';
import { Container } from 'semantic-ui-react';
import { Switch, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import NewChannel from './pages/NewChannel';
import ChannelShow from './pages/ChannelShow';
import ChannelOpen from './pages/ChannelOpen';
import ChannelPurchase from './pages/ChannelPurchase';
import 'semantic-ui-css/semantic.min.css';

class App extends Component {
    render() {
        return (
            <Container>
                <Header />
                <main>
                    <Switch>
                        <Route exact path='/' component={Home}/>
                        <Route exact path='/channels/new' component={NewChannel}/>
                        <Route exact path='/channels/:id' component={ChannelShow}/>
                        <Route exact path='/channels/open/:id' component={ChannelOpen}></Route>
                        <Route exact path='/channels/purchase/:id' component={ChannelPurchase}></Route>
                    </Switch>
                </main>
            </Container>
        );
    }
}

export default App;
