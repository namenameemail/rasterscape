import { io } from "socket.io-client";

// это нужно было для списка комнат

export const connectRooms = () => {
    const socket = io("http://localhost:3000", {
        path: '/rooms',
    });
    return socket;
};