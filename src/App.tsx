import React, { Component } from 'react';
import { Navigator } from 'react-onsenui'
import RoomList from './pages/RoomList';
import * as firebase from 'firebase/app';


export interface RouteDefinition {
  component: string;
  payload: any;
}


class App extends Component {
  private readonly database: firebase.database.Database;

  constructor(props: {}) {
    super(props);
    this.database = firebase.database();
  }


  private renderPage = (route: RouteDefinition, navigator?: Navigator) => {
    const {component, payload} = route;
    switch (component) {
      case 'RoomList': {
        return <RoomList database={this.database} navigator={navigator}/>
      } default: {
        throw new Error('no matching root.')
      }
    }
  };

  render() {
    return (
      <Navigator
        renderPage={this.renderPage}
        initialRoute={{
          component: 'RoomList',
        }}
      />
    );
  }
}

export default App;
