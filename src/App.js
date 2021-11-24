import React, { Component } from 'react';
import { Container } from 'semantic-ui-react';
import { Switch, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import NewChannel from './pages/NewChannel';
import DeliveryShow from './pages/DeliveryShow';
import 'semantic-ui-css/semantic.min.css';

class App extends Component {
    render() {
        return (
            <Container>
                <Header />
                <main>
                    <Switch>
                        <Route exact path='/' component={Home}/>
                        <Route exact path='/deliveries/new' component={NewChannel}/>
                        <Route exact path='/deliveries/:address' component={DeliveryShow}/>
                    </Switch>
                </main>
            </Container>
        );
    }
}

export default App;
