import React, { Component } from 'react';
import { BackButton, List, ListHeader, ListItem, Navigator, Page, Toolbar } from 'react-onsenui';
import * as firebase from 'firebase/app';
import 'firebase/database';
import { Room } from '../object-types/object-types';
import { RouteDefinition } from '../App';

interface Props {
  database: firebase.database.Database;
  navigator?: Navigator;
}

interface RoomStats {
  name: string,
  key: string,
  activeMemberCount: number,
}

interface State {
  rooms: RoomStats[] | undefined;
}

export default class RoomList extends Component<Props, State> {
  private readonly roomsRef: firebase.database.Reference;

  constructor(props: Props) {
    super(props);
    this.state = {rooms: undefined};
    this.roomsRef = this.props.database.ref('/rooms');
  }

  componentDidMount() {
    this.roomsRef.on('value', snapshot => {
      if (snapshot == null) {
        this.setState({rooms: undefined});
        return;
      }

      const rooms = snapshot.toJSON() as {[key in string]: Room};
      const roomKeys: string[] = Object.keys(rooms);


      this.setState({
        rooms: roomKeys.map(key => {
          const room = rooms[key];
          let activeMemberCount = 0;
          if (room.members != null) {
            activeMemberCount = Object.keys(room.members).length; // TODO: filter out nonactive member
          }

          return {
            key, activeMemberCount, name: rooms[key].name,
          } as RoomStats
        })
      })
    });
  }

  private renderRooms() {
    const {rooms} = this.state;

    if (rooms == null) {
      return null;
    }

    return (
      <>
        {rooms.map((room: RoomStats) => {
          const route: RouteDefinition = {
            component: 'RoomDetail',
            payload: {
              roomKey: room.key,
            },
          };
          return (
            <ListItem key={room.key} onClick={() => {this.props.navigator!.pushPage(route)}}>
              {room.key} / {room.name} / {room.activeMemberCount}
            </ListItem>
          )
        })}
      </>
    )
  }


  private renderToolbar = () => (
    <Toolbar>
      <div className="center">
        Room List
      </div>
    </Toolbar>
  );

  render() {
    return (
      <Page renderToolbar={this.renderToolbar}>
        <List>
          <ListHeader>header</ListHeader>
          {this.renderRooms()}
        </List>
      </Page>
    )
  }
}