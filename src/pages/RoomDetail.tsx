import * as React from 'react';
import { Component } from 'react';
import * as firebase from 'firebase/app';
import { card2component, CARD_CHOICES, CardChoice, Member, Room } from '../object-types/object-types';
import {
  BackButton, Button,
  Fab,
  Icon,
  List,
  ListItem,
  Navigator,
  Page,
  SpeedDial,
  SpeedDialItem, Toast,
  Toolbar
} from 'react-onsenui';
import { interval, Subscription } from 'rxjs';
import { getTimeOffsetFromDatabaseAsync } from './utils';

interface MemberStats extends Member {
  key: string;
}

interface Props {
  roomKey: string;
  myPresenceKey: string;
  myName: string;
  database: firebase.database.Database;
  navigator?: Navigator;
}

interface State {
  activeMembers: MemberStats[];
  roomName: string;
  revealed: boolean;
}


export default class RoomDetail extends Component<Props, State> {
  private readonly roomRef: firebase.database.Reference;
  private readonly myPresenceRef: firebase.database.Reference;

  constructor(props: Props) {
    super(props);
    this.state = {roomName: '', activeMembers: [], revealed: false};

    const {database, roomKey, myPresenceKey} = props;
    this.roomRef =  database.ref(`/rooms/${roomKey}`);
    this.myPresenceRef = this.roomRef.child(`members/${myPresenceKey}`);
  }

  private intervalSubscription?: Subscription;
  private serverTimeOffset: number = 0;

  async componentDidMount() {
    this.roomRef.child('name').on('value', snapshot => {
      if (snapshot == null) {
        return;
      }
      this.setState({roomName: snapshot.val()});
    });

    this.roomRef.child('revealed').on('value', snapshot => {
      if (snapshot == null) {
        return;
      }
      this.setState({revealed: snapshot.val()});
    });

    this.roomRef.child('members').orderByChild('joined_at').on('value', snapshot => {
      if (snapshot == null) {
        return;
      }

      const members: MemberStats[] = [];
      snapshot.forEach(member => {
        members.push({
          ...(member.toJSON() as Member),
          key: member.key as string
        });
      });

      const serverTimestamp = new Date().getTime() + this.serverTimeOffset;  // TODO: make server timestamp singleton object
      const MEMBER_INACTIVITY_THRESHOLD_MILLISECOND = 1000 * 60;  // 1 min.  TODO: fix duplication of definition
      const activeMembers = members.filter(member =>
        member.last_seen_at >= serverTimestamp - MEMBER_INACTIVITY_THRESHOLD_MILLISECOND
      );
      this.setState({activeMembers});
    });

    this.serverTimeOffset = await getTimeOffsetFromDatabaseAsync(this.props.database);

    await this.myPresenceRef.remove();
    await this.myPresenceRef.set({
      last_seen_at: firebase.database.ServerValue.TIMESTAMP,
      joined_at: firebase.database.ServerValue.TIMESTAMP,
      display_name: this.props.myName,
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

  private async revealChoices(positive: boolean = true) {
    await this.roomRef.child('revealed').set(positive);
  }

  private async resetAllChoices() {
    const snapshot = await this.roomRef.child('members').once('value');
    const resetPromises: Array<Promise<void>> = [];
    snapshot.forEach(memberRef => {
      resetPromises.push(memberRef.child('card_choice').ref.set(''));
    });
    await Promise.all(resetPromises);
    await this.revealChoices(false);
  }

  private renderToolbar = () => {
    return (
      <Toolbar>
        <div className="left">
          <BackButton onClick={() => this.props.navigator!.popPage()}/>
        </div>
        <div className="center">
          Room Detail {this.state.roomName}
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
          <SpeedDialItem key={choice} onClick={() => this.setMyChoice(choice)}>
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

    const {activeMembers, revealed} = this.state;

    if (activeMembers.length == 0) {
      return loading();
    }

    return (
      <List>
        {activeMembers.map((member: MemberStats) => {
          const cardChoice = member.card_choice;
          let label: string;
          if (CARD_CHOICES.indexOf(cardChoice) != -1) {
            label = revealed ? card2component[cardChoice] : 'ready!';
          } else {
            label = revealed ? '(not specified)' : 'not ready';
          }
          return (
            <ListItem key={member.key}>
              {label} / {member.display_name}
            </ListItem>
          );
        })}
      </List>
    );
  }

  private renderToast() {
    const {activeMembers, revealed} = this.state;
    const isToastOpen: boolean = (
      !revealed && activeMembers.length > 0
       && activeMembers.every(member => !!member.card_choice)
    );
    return (
      <>
        <Toast isOpen={isToastOpen}>
          All Members Ready!
          <button onClick={() => this.revealChoices()}>GO</button>
        </Toast>
        <Toast isOpen={!!revealed}>
          <button onClick={() => this.resetAllChoices()}>RESET</button>
        </Toast>
      </>
    )
  }

  private renderFixed() {
    return (
      <>
        {this.renderSpeedDial()}
        {this.renderToast()}
      </>
    )
  }

  render() {
    return (
      <Page renderToolbar={this.renderToolbar} renderFixed={() => this.renderFixed()}>
        {this.renderList()}
      </Page>
    );
  }
}
