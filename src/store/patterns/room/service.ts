import { io, Socket } from "socket.io-client";
import {base64ToImageData, imageDataToBase64} from "../../../utils/canvas/helpers/imageData";
import {updateImage} from "../pattern/actions";
import {receiveDrawer, receiveMembers, receiveMessage} from "./actions";
import {MessageData} from "./types";

export const createRoomSocket = (name: string, handlers: RoomSocketHandlers) => {
    const socket = io(API_URL, {
        path: '/room',
        query: {name}
    });
    return new RoomSocket(socket, handlers);
};

export interface RoomSocketHandlers {
    onImage(imageBase64: string)

    onMessage(data: MessageData, isMine: boolean)

    onDrawer(drawer: string)

    onMembers(members: string)

    onAuth(token: string)
}

export class RoomSocket {

    socket: Socket;
    token?: string;

    constructor(socket: Socket, handlers: RoomSocketHandlers) {
        this.socket = socket;

        const {
            onImage,
            onMessage,
            onDrawer,
            onMembers,
            onAuth,
        } = handlers

        this.socket.on("image", onImage);

        this.socket.on("message", onMessage);

        this.socket.on("drawer", onDrawer);

        this.socket.on("members", onMembers);

        this.socket.on("auth", onAuth);
    }

    setToken = (token: string) => {
        this.token = token;
    }

    leave = () => {
        this.socket.disconnect();
    }

    image = (imageBase64: string) => {
        this.socket.emit("image", {
            imageBase64,
            token: this.token
        });
    };

    message = (right, left, imageBase64: string) => {
        this.socket.emit("message", {
            right,
            left,
            imageBase64,
            token: this.token
        });
    };

    drawer = (drawer: string) => {
        this.socket.emit("drawer", drawer);
    };
}

export class RoomSockets {

    sockets: {
        [patternId: string]: RoomSocket
    } = {};

    add = (id: string, socket: RoomSocket) => {
        this.sockets[id] = socket;
    };

    leave = (id: string) => {
        this.sockets[id].leave();
        this.sockets[id] = undefined;
    };

    get = (id: string): RoomSocket => this.sockets[id];

}

export const roomSockets = new RoomSockets();