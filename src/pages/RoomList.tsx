import React, { Component } from 'react';
import { Button, Fab, Icon, Input, List, ListHeader, ListItem, Modal, Navigator, Page, Toolbar } from 'react-onsenui';
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
  isModalOpen: boolean;
  newRoomName: string;
}

export default class RoomList extends Component<Props, State> {
  private readonly roomsRef: firebase.database.Reference;

  constructor(props: Props) {
    super(props);
    this.state = {rooms: undefined, isModalOpen: false, newRoomName: ''};
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

  private async createRoom() {
    await this.roomsRef.push({
      last_seen_at: firebase.database.ServerValue.TIMESTAMP,
      name: this.state.newRoomName,
    } as Room);
    this.closeModal();
  }

  private renderNewRoomModal() {
    const {isModalOpen} = this.state;
    return (
      <Modal isOpen={isModalOpen}>
        <span onClick={() => this.closeModal()} style={{position: 'fixed', left: 20, top: 20}}>
          <Icon icon="fa-times" size={30}/>
        </span>
        <div style={{textAlign: 'center', marginTop: 30}}>
          <p>Create New Room</p>
          <p>
            <Input onChange={(event) => { this.setState({newRoomName: event.target.value})} }
                   placeholder="Name" modifier="underbar" />
          </p>
          <p>
            <Button disabled={this.state.newRoomName.length === 0}
                    onClick={() => this.createRoom()}
            >create</Button>
          </p>
        </div>
      </Modal>
    )
  }

  private openModal() {
    this.setState({
      isModalOpen: true,
      newRoomName: '',
    })
  }

  private closeModal() {
    this.setState({
      isModalOpen: false,
      newRoomName: '',
    })
  }

  render() {
    return (
      <Page renderToolbar={this.renderToolbar} renderFixed={() => (
        <>
          {this.state.isModalOpen ? null :
            <Fab position="bottom right" ripple={true} onClick={() => this.openModal()}>
              <Icon icon="fa-plus"/>
            </Fab>}
          {this.renderNewRoomModal()}
        </>
      )}>
        <List>
          <ListHeader>header</ListHeader>
          {this.renderRooms()}
        </List>
      </Page>
    )
  }
}