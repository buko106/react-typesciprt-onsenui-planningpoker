import React, { Component } from 'react';
import { Button, Fab, Icon, Input, List, ListHeader, ListItem, Modal, Navigator, Page, Toolbar } from 'react-onsenui';
import * as firebase from 'firebase/app';
import 'firebase/database';
import { Room } from '../object-types/object-types';
import { RouteDefinition } from '../App';
import { getTimeOffsetFromDatabaseAsync } from './utils';

interface Props {
  database: firebase.database.Database;
  navigator?: Navigator;
}

interface RoomStats {
  name: string,
  key: string,
  lastSeenAt: number,
  activeMemberCount: number,
}

interface State {
  rooms: RoomStats[] | undefined;
  isModalOpen: boolean;
  newRoomName: string;
}

export default class RoomList extends Component<Props, State> {
  private readonly roomsRef: firebase.database.Reference;
  private serverTimeOffset: number = 0;

  constructor(props: Props) {
    super(props);
    this.state = {rooms: undefined, isModalOpen: false, newRoomName: ''};
    this.roomsRef = this.props.database.ref('/rooms');
  }

  async componentDidMount() {
    this.serverTimeOffset = await getTimeOffsetFromDatabaseAsync(this.props.database);

    const ROOM_INACTIVITY_THRESHOLD_MILLISECOND = 3 * 60 * 1000;  // 3 min.
    this.roomsRef
    .startAt(new Date().getTime() + this.serverTimeOffset - ROOM_INACTIVITY_THRESHOLD_MILLISECOND)
    .orderByChild('last_seen_at')
    .on('value', snapshot => {
      if (snapshot == null) {
        this.setState({rooms: undefined});
        return;
      }

      const roomKeys: string[] = [];
      snapshot.forEach(roomRef => {
        roomKeys.push(roomRef.key as string);
      });
      roomKeys.reverse();

      const rooms = snapshot.toJSON() as {[key in string]: Room};

      const serverTimestamp = new Date().getTime() + this.serverTimeOffset;  // TODO: make server timestamp singleton object
      const MEMBER_INACTIVITY_THRESHOLD_MILLISECOND = 1000 * 60;  // 1 min.  TODO: fix duplication of definition

      this.setState({
        rooms: roomKeys.map(key => {
          const room = rooms[key];
          let activeMemberCount = 0;
          if (room.members != null) {
            const memberKeys = Object.keys(room.members);
            activeMemberCount = memberKeys.filter(
              key => room.members![key].last_seen_at >= serverTimestamp - MEMBER_INACTIVITY_THRESHOLD_MILLISECOND
            ).length;
          }

          return {
            key, activeMemberCount, name: rooms[key].name,
            lastSeenAt: rooms[key].last_seen_at,
          } as RoomStats
        })
      })
    });
  }

  private renderRooms() {
    const {rooms} = this.state;

    if (rooms == null) {
      return (
        <ListItem key="loading">
          Loading...
        </ListItem>
      );
    } else if (rooms.length == 0) {
      return (
        <ListItem key="no-active-room">
          アクティブな部屋がありません
        </ListItem>
      );
    }

    return (
      <>
        <ListHeader>ACTIVE ROOMS</ListHeader>
        {rooms.map((room: RoomStats) => {
          const route: RouteDefinition = {
            component: 'RoomDetail',
            payload: {
              roomKey: room.key,
            },
          };
          return (
            <ListItem key={room.key} onClick={() => {this.props.navigator!.pushPage(route)}}>
              {room.name} / {room.activeMemberCount}人
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
          {this.renderRooms()}
        </List>
      </Page>
    )
  }
}