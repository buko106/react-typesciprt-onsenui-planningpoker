import * as firebase from 'firebase/app';
import React, { Component } from 'react';
import { Navigator } from 'react-onsenui';
import uuidv4 from 'uuid/v4';
import RoomDetail from './pages/RoomDetail';
import RoomList from './pages/RoomList';

export interface RouteDefinition {
  component: string;
  payload: any;
}

class App extends Component {
  private readonly database: firebase.database.Database;
  private readonly myPresenceKey: string;

  constructor(props: {}) {
    super(props);
    this.database = firebase.database();
    this.myPresenceKey = localStorage.getItem('myPresenceKey') || uuidv4();
    localStorage.setItem('myPresenceKey', this.myPresenceKey);
  }

  public render() {
    return (
      <Navigator
        renderPage={this.renderPage}
        initialRoute={{
          component: 'RoomList',
        }}
      />
    );
  }

  private renderPage = (route: RouteDefinition, navigator?: Navigator) => {
    const { component, payload } = route;
    switch (component) {
      case 'RoomList': {
        return <RoomList database={this.database} navigator={navigator} />;
      }
      case 'RoomDetail': {
        return (
          <RoomDetail
            myPresenceKey={this.myPresenceKey}
            roomKey={payload.roomKey}
            myName={payload.myName}
            database={this.database}
            navigator={navigator}
          />
        );
      }
      default: {
        throw new Error('no matching root.');
      }
    }
  };
}

export default App;
