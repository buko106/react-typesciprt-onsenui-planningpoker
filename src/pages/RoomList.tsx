import { Component } from 'react';
import { List, ListHeader, ListItem, Page, Toolbar } from 'react-onsenui';
import React from 'react';

export default class RoomList extends Component {

  private renderToolbar = () => (
    <Toolbar>
      <div className="center">
        Title
      </div>
    </Toolbar>
  );

  render() {
    return (
      <Page renderToolbar={this.renderToolbar}>
        <List>
          <ListHeader>header</ListHeader>
          <ListItem>item1</ListItem>
          <ListItem>item1</ListItem>
          <ListItem>item1</ListItem>
        </List>
      </Page>
    )
  }
}