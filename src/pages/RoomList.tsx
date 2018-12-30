import * as firebase from 'firebase/app';
import 'firebase/database';
import React, { Component } from 'react';
import {
  Button,
  Fab,
  Icon,
  Input,
  List,
  ListHeader,
  ListItem,
  Modal,
  Navigator,
  Page,
  Toolbar,
} from 'react-onsenui';
import { interval, Subscription } from 'rxjs';
import { RouteDefinition } from '../App';
import { Room } from '../object-types/object-types';
import { getTimeOffsetFromDatabaseAsync } from './utils';

interface Props {
  database: firebase.database.Database;
  navigator?: Navigator;
}

interface RoomStats {
  name: string;
  key: string;
  lastSeenAt: number;
  activeMemberCount: number;
}

interface State {
  rooms: RoomStats[] | undefined;
  isModalOpen: boolean;
  newRoomName: string;
  userName: string;
}

export default class RoomList extends Component<Props, State> {
  private readonly roomsRef: firebase.database.Reference;
  private serverTimeOffset: number = 0;
  private forceUpdateSubscription?: Subscription;

  constructor(props: Props) {
    super(props);
    this.state = {
      rooms: undefined,
      isModalOpen: false,
      newRoomName: '',
      userName: localStorage.getItem('myName') || '',
    };
    this.roomsRef = this.props.database.ref('/rooms');
  }

  public async componentDidMount() {
    this.forceUpdateSubscription = interval(1000).subscribe(() => {
      this.forceUpdate();
    });

    this.serverTimeOffset = await getTimeOffsetFromDatabaseAsync(
      this.props.database
    );

    const ROOM_INACTIVITY_THRESHOLD_MILLISECOND = 3 * 60 * 1000; // 3 min.
    this.roomsRef
      .startAt(
        new Date().getTime() +
          this.serverTimeOffset -
          ROOM_INACTIVITY_THRESHOLD_MILLISECOND
      )
      .orderByChild('last_seen_at')
      .on('value', snapshot => {
        if (snapshot == null) {
          this.setState({ rooms: undefined });
          return;
        }

        const roomKeys: string[] = [];
        snapshot.forEach(roomRef => {
          roomKeys.push(roomRef.key as string);
        });
        roomKeys.reverse();

        const rooms = snapshot.toJSON() as { [key in string]: Room };

        const serverTimestamp = new Date().getTime() + this.serverTimeOffset; // TODO: make server timestamp singleton object
        const MEMBER_INACTIVITY_THRESHOLD_MILLISECOND = 1000 * 60; // 1 min.  TODO: fix duplication of definition

        this.setState({
          rooms: roomKeys.map(key => {
            const room = rooms[key];
            let activeMemberCount = 0;
            if (room.members != null) {
              const memberKeys = Object.keys(room.members);
              activeMemberCount = memberKeys.filter(
                memberKey =>
                  room.members![memberKey].last_seen_at >=
                  serverTimestamp - MEMBER_INACTIVITY_THRESHOLD_MILLISECOND
              ).length;
            }

            return {
              key,
              activeMemberCount,
              name: rooms[key].name,
              lastSeenAt: rooms[key].last_seen_at,
            } as RoomStats;
          }),
        });
      });
  }

  public componentWillUnmount() {
    if (this.forceUpdateSubscription) {
      this.forceUpdateSubscription.unsubscribe();
    }
  }

  public render() {
    return (
      <Page
        renderToolbar={this.renderToolbar}
        renderFixed={() => (
          <>
            {this.state.isModalOpen ? null : (
              <Fab
                position="bottom right"
                ripple={true}
                onClick={() => this.openModal()}
              >
                <Icon icon="fa-plus" />
              </Fab>
            )}
            {this.renderNewRoomModal()}
          </>
        )}
      >
        <List>
          {this.renderNameInputItem()}
          {this.renderRooms()}
        </List>
      </Page>
    );
  }

  private async onClickRoom(key: string) {
    const route: RouteDefinition = {
      component: 'RoomDetail',
      payload: {
        roomKey: key,
        myName: this.state.userName,
      },
    };
    await this.props.navigator!.pushPage(route);
  }

  private renderRooms() {
    const { rooms } = this.state;

    if (rooms == null) {
      return <ListItem key="loading">Loading...</ListItem>;
    } else if (rooms.length === 0) {
      return (
        <>
          <ListHeader>ACTIVE ROOMS</ListHeader>
          <ListItem key="no-active-room">アクティブな部屋がありません</ListItem>
        </>
      );
    }

    return (
      <>
        <ListHeader>ACTIVE ROOMS</ListHeader>
        {rooms.map((room: RoomStats) => {
          return (
            <ListItem
              key={room.key}
              onClick={() => {
                this.onClickRoom(room.key);
              }}
            >
              {room.name} / {room.activeMemberCount}人
            </ListItem>
          );
        })}
      </>
    );
  }

  private renderToolbar = () => (
    <Toolbar>
      <div className="center">Room List</div>
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
    const { isModalOpen } = this.state;
    return (
      <Modal isOpen={isModalOpen}>
        <span
          onClick={() => this.closeModal()}
          style={{ position: 'fixed', left: 20, top: 20 }}
        >
          <Icon icon="fa-times" size={30} />
        </span>
        <div style={{ textAlign: 'center', marginTop: 30 }}>
          <p>Create New Room</p>
          <p>
            <Input
              onChange={event => {
                this.setState({ newRoomName: event.target.value });
              }}
              placeholder="Name"
              modifier="underbar"
              value={this.state.newRoomName}
            />
          </p>
          <p>
            <Button
              disabled={this.state.newRoomName.length === 0}
              onClick={() => this.createRoom()}
            >
              create
            </Button>
          </p>
        </div>
      </Modal>
    );
  }

  private renderNameInputItem() {
    const onChange = (e: React.ChangeEvent<any>) => {
      const userName: string = e.target.value;
      localStorage.setItem('myName', userName);
      this.setState({ userName });
    };

    return (
      <>
        <ListHeader>What's your name?</ListHeader>
        <ListItem>
          <Input
            value={this.state.userName}
            modifier="underbar"
            onChange={onChange}
          />
        </ListItem>
      </>
    );
  }

  private openModal() {
    this.setState({
      isModalOpen: true,
      newRoomName: '',
    });
  }

  private closeModal() {
    this.setState({
      isModalOpen: false,
      newRoomName: '',
    });
  }
}
