import * as React from 'react';
import { Component } from 'react';
import * as firebase from 'firebase/app';
import { card2component, CARD_CHOICES, CardChoice, Member, Room } from '../object-types/object-types';
import {
  BackButton,
  Fab,
  Icon,
  List,
  ListItem,
  Navigator,
  Page,
  SpeedDial,
  SpeedDialItem,
  Toolbar
} from 'react-onsenui';
import { interval, Subscription } from 'rxjs';
import { getTimeOffsetFromDatabaseAsync } from './utils';

interface Props {
  roomKey: string;
  myPresenceKey: string;
  database: firebase.database.Database;
  navigator?: Navigator;
}

interface State {
  room: Room | undefined;
}

interface MemberStats extends Member {
  key: string;
}

export default class RoomDetail extends Component<Props, State> {
  private readonly roomRef: firebase.database.Reference;
  private readonly myPresenceRef: firebase.database.Reference;

  constructor(props: Props) {
    super(props);
    this.state = {room: undefined};

    const {database, roomKey, myPresenceKey} = props;
    this.roomRef =  database.ref(`/rooms/${roomKey}`);
    this.myPresenceRef = this.roomRef.child(`members/${myPresenceKey}`);
  }

  private intervalSubscription?: Subscription;
  private serverTimeOffset: number = 0;

  async componentDidMount() {
    this.roomRef.on('value', snapshot => {
      if (snapshot == null) {
        return;
      }

      const room = snapshot.toJSON() as Room;
      this.setState({room});
    });
    this.serverTimeOffset = await getTimeOffsetFromDatabaseAsync(this.props.database);

    await this.myPresenceRef.remove();
    await this.myPresenceRef.set({
      last_seen_at: firebase.database.ServerValue.TIMESTAMP,
      joined_at: firebase.database.ServerValue.TIMESTAMP,
      display_name: 'todo(name)',
      card_choice: '',
    });

    this.intervalSubscription = interval(1000).subscribe(() => {
      this.myPresenceRef.update({
        last_seen_at: firebase.database.ServerValue.TIMESTAMP,
      } as Partial<Member>);
      this.roomRef.update({
        last_seen_at: firebase.database.ServerValue.TIMESTAMP,
      } as Partial<Room>)
    });
  }

  componentWillUnmount() {
    this.roomRef.off();
    this.myPresenceRef.remove();
    if (this.intervalSubscription) {
      this.intervalSubscription.unsubscribe();
    }
  }

  private async setMyChoice(choice: CardChoice | undefined) {
    (document.getElementById('RoomDetail__SpeedDial')! as any).hideItems();
    if (choice != null) {
      await this.myPresenceRef.child('card_choice').set(choice);
    } else {
      await this.myPresenceRef.child('card_choice').set('');
    }
  }

  private renderToolbar = () => {
    const roomName = this.state.room ? this.state.room.name : '';

    return (
      <Toolbar>
        <div className="left">
          <BackButton onClick={() => this.props.navigator!.popPage()}/>
        </div>
        <div className="center">
          Room Detail {roomName}
        </div>
      </Toolbar>
    )
  };

  private renderSpeedDial() {
    return (
      <SpeedDial id="RoomDetail__SpeedDial" direction="up" position="bottom right">
        <Fab>
          <Icon icon="fa-caret-up" />
        </Fab>
        <SpeedDialItem onClick={() => this.setMyChoice(undefined)}>
          <Icon icon="fa-trash" />
        </SpeedDialItem>
        {CARD_CHOICES.map(choice => (
          <SpeedDialItem onClick={() => this.setMyChoice(choice)}>
            <span>{card2component[choice]}</span>
          </SpeedDialItem>
        ))}
      </SpeedDial>
    )
  };

  private renderList() {
    const loading = () => (
      <List>
        <ListItem>
          読み込み中...
        </ListItem>
      </List>
    );


    const {room} = this.state;
    const memberKeys: string[] = room ? Object.keys(room.members || {}) : [];
    if (memberKeys.length == 0) {
      return loading();
    }

    const serverTimestamp = new Date().getTime() + this.serverTimeOffset;
    const MEMBER_INACTIVITY_THRESHOLD_MILLISECOND = 1000 * 60;  // 1 min.
    const members = memberKeys.map(key => {
      const member: Member = room!.members![key];
      return {...member, key};
    }).filter(
      (member: MemberStats) => (member.last_seen_at >= serverTimestamp - MEMBER_INACTIVITY_THRESHOLD_MILLISECOND)
    );

    return (
      <List>
        {members.map((member: MemberStats) => (
          <ListItem key={member.key}>
            {member.card_choice} / {member.display_name}
          </ListItem>
        ))}
      </List>
    );
  }

  render() {
    return (
      <Page renderToolbar={this.renderToolbar} renderFixed={() => this.renderSpeedDial()}>
        {this.renderList()}
      </Page>
    );
  }
}
