import * as React from 'react';
import { Component } from 'react';
import * as firebase from 'firebase/app';
import { Member, Room } from '../object-types/object-types';
import { BackButton, List, ListItem, Navigator, Page, Toolbar } from 'react-onsenui';
import { interval, Subscription } from 'rxjs';

interface Props {
  roomKey: string;
  myPresenceKey: string;
  database: firebase.database.Database;
  navigator?: Navigator;
}

interface State {
  room: Room | undefined;
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

  async componentDidMount() {
    this.roomRef.on('value', snapshot => {
      if (snapshot == null) {
        return;
      }

      const room = snapshot.toJSON() as Room;
      this.setState({room});
    });

    await this.myPresenceRef.set({
      last_seen_at: firebase.database.ServerValue.TIMESTAMP,
      joined_at: firebase.database.ServerValue.TIMESTAMP,
      display_name: 'todo(name)',
    } as Member);

    this.intervalSubscription = interval(1000).subscribe(() => {
      this.myPresenceRef.update({
        last_seen_at: firebase.database.ServerValue.TIMESTAMP,
      } as Partial<Member>)
    });
  }

  componentWillUnmount() {
    this.roomRef.off();
    this.myPresenceRef.remove();
    if (this.intervalSubscription) {
      this.intervalSubscription.unsubscribe();
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

  render() {
    const {room} = this.state;

    return (
      <Page renderToolbar={this.renderToolbar}>
        <List>
          <ListItem>
            {JSON.stringify(room)}
          </ListItem>
        </List>
      </Page>
    );
  }
}
