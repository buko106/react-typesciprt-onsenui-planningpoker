import * as React from 'react';
import { Component } from 'react';
import * as firebase from 'firebase/app';
import { Room } from '../object-types/object-types';
import { List, ListItem, Page, Toolbar, Navigator, BackButton } from 'react-onsenui';

interface Props {
  roomKey: string;
  database: firebase.database.Database;
  navigator?: Navigator;
}

interface State {
  room: Room | undefined;
}

export default class RoomDetail extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {room: undefined};

    const {database, roomKey} = props;
    this.roomRef =  database.ref(`/rooms/${roomKey}`);
  }

  componentDidMount() {
    this.roomRef.on('value', snapshot => {
      if (snapshot == null) {
        return;
      }

      const room = snapshot.toJSON() as Room;
      this.setState({room});
    });
  }

  private readonly roomRef: firebase.database.Reference;
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
