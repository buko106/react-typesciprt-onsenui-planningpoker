import React, { Component } from 'react';
import { List, ListHeader, ListItem, Navigator, Page, Toolbar } from 'react-onsenui'
import RoomList from './pages/RoomList';


interface RouteDefinition {
  component: string;
  payload: any;
}


class App extends Component {
  private renderPage = (route: RouteDefinition, navigator?: Navigator) => {
    const {component, payload} = route;
    switch (component) {
      case 'RoomList': {
        return <RoomList/>
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
