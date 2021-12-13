import React, { Component } from 'react';
import { withRouter, Link } from "react-router-dom";
import { Form, Button, Message, Input, Dimmer, Loader } from 'semantic-ui-react';
import web3 from '../ethereum/web3';

class ChannelShow extends Component {
  state = {
    channel:'',
    loading: false,
    errorMessage: ''
  };

  componentDidMount = async () => {

    this.setState({ loading: true, errorMessage: '' });

    try {
      let id = this.props.match.params.id;
      console.log(id)

      var channel = await fetch('http://localhost:7000/channels/'+id, {
        headers:{
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })
      .then(res =>{
        //console.log('response ',res);
        return res.json();
      }).then(data =>{
        console.log('data', data);
        this.setState({
          channel: data,
        })
       })
      console.log(this.state.channel);
    } catch (err) {
      this.setState({ errorMessage: err.message });
    } finally {
      this.setState({ loading: false });
    }
  }

  onSubmit = async event => {
    event.preventDefault();

    // Refresh, using withRouter
    this.props.history.push('/');
  };

  render() {
    
    return (
      <div>
        <Dimmer inverted active={this.state.loading}>
          <Loader inverted content='Loading...'></Loader>
        </Dimmer>
        <Link to='/'>Back</Link>
        <h3>Show Channel</h3>
        <Form onSubmit={this.onSubmit} error={!!this.state.errorMessage} hidden={this.state.loading}>
          <Form.Field>
            <label>Merchant</label>
            <Input
              readOnly
              value={this.state.channel.merchant}
            />
          </Form.Field>

          <Form.Field>
            <label>Customer</label>
            <Input
              readOnly
              value={this.state.channel.customer}
            />
          </Form.Field>

          <Form.Field>
            <label>Service</label>
            <Input
              readOnly
              value={this.state.channel.service}
            />
          </Form.Field>

          <Form.Field>
            <label>Service price</label>
            <Input
              readOnly
              value={this.state.channel.service_price}
            />
          </Form.Field>

          <Form.Field>
            <label>µ-coins</label>
            <Input
              label="wei"
              labelPosition="right"
              value={this.state.channel.c}
            />
          </Form.Field>
        {(this.state.channel.State === 'accepted' || this.state.channel.State === 'opened' || 
        this.state.channel.State === 'payment' || this.state.channel.State === 'send service'|| 
        this.state.channel.State === 'send proof') && (
        <Form.Field>
            <label>W<sub>0M</sub></label>
            <Input
              readOnly
              value={this.state.channel.W_0M}
            />
          </Form.Field>)}
           {(this.state.channel.State === 'opened' || this.state.channel.State === 'payment' || 
           this.state.channel.State === 'send service' || this.state.channel.State === 'send proof') && (
          <Form>
          <Form.Field>
            <label>W<sub>0C</sub></label>
            <Input
              readOnly
              value={this.state.channel.W_0C}
            />
          </Form.Field>

          <Form.Field>
            <label>ethAddress</label>
            <Input
              readOnly
              value={this.state.channel.ethAddress}
            />
          </Form.Field> 
         
            <Form.Field>
              <label>m<sub>1</sub></label>
              <Input readOnly value={this.state.channel.messages.m1}/>
            </Form.Field>

            <Form.Field>
            <label>m<sub>2</sub></label>
            <Input readOnly value={this.state.channel.messages.m2}/>
            </Form.Field>
            <Form.Field>

            <label>m<sub>3</sub></label>
            <Input readOnly value={this.state.channel.messages.m3}/>
          </Form.Field>

            <Form.Field>
              <label>i</label>
              <Input readOnly value={this.state.channel.messages.i}/>
            </Form.Field>

            <Form.Field>
              <label>W_ic</label>
              <Input readOnly value={this.state.channel.W_ic}/>
            </Form.Field>
          </Form>
          )}
          
          <Form>
          <Form.Field>
          <Message error header="ERROR" content={this.state.errorMessage} />
          <Button primary loading={this.state.loading}>
            Close
          </Button>
          </Form.Field>
          </Form>
        </Form>
      </div>
    );
  }
}


export default withRouter(ChannelShow);
