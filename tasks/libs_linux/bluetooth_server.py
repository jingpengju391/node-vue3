#! /usr/bin/python3.8
# -*- coding: utf-8 -*-
# ===============================
#  华乘T95局放蓝牙通信类
# ===============================

__author__    = 'aojiaoshou <jingpengju@ultrapower.com.cn>'
__copyright__ = ['Copyright (c) 2025 Beijing Etop Co.top']
__license__   = 'MIT'
__url__       = 'http://www.ultrapower.com.cn'
__version__   = '1.0'

import os
import bluetooth
from bluetooth import *
import time
import threading
import sys
from datetime import date

# UUID for the Serial Port Profile (SPP)
T95_BT_SERIAL_SERVICE = "00001101-0000-1000-8000-00805F9B34FB"

# Protocol packet types (must match JS side)
PACKET_TYPE = {
    "CONNECTED": 1,
    "DISCONNECTED": 2,
    "DATA": 3,
    "ACK": 4
}

T95_BT_MSG_TYPE_CON_REQ = 0x02

class T95_BT:
    def __init__(self):
        self.server_sock = None
        self.client_socket = None
        self.client_info = ("00:00:00:00:00:00", 0)
        self.thread_run = False
        self.thread = None
        self.log_file = self._get_log_file()

    def _get_log_file(self):
        today = date.today().strftime("%Y-%m-%d")
        log_dir = "/home/firefly/TYAPP/logs"
        os.makedirs(log_dir, exist_ok=True)
        return os.path.join(log_dir, f"{today}.log")

    def _log(self, message):
        with open(self.log_file, 'a') as log:
            log.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}.{int(time.time() * 1000) % 1000:03d}] ['bluetooth']  {message}\n")

    def format_mac(self, mac_str):
        mac_bytes = mac_str.encode('utf-8')
        return mac_bytes + b'\0' * (17 - len(mac_bytes))

    def send_packet(self, packet_type_key, data):
        mac = self.format_mac(self.client_info[0])
        packet_type = PACKET_TYPE.get(packet_type_key, PACKET_TYPE["DATA"])
        packet = bytes([packet_type]) + mac + data
        packet_with_len = len(packet).to_bytes(2, "big") + packet
        self._log(f"Received data & mac: {packet.hex()}")
        try:
            sys.stdout.buffer.write(packet_with_len)
            sys.stdout.buffer.flush()
        except Exception as e:
            self._log(f"Error writing to stdout: {e}")

    def bt_recv_thread(self):
        while self.thread_run:
            try:
                recv_data = self.client_socket.recv(1024)
                if not recv_data:
                    continue

                if len(recv_data) >= 20:
                    msg_type = int.from_bytes(recv_data[16:20], byteorder="big")
                    if msg_type == T95_BT_MSG_TYPE_CON_REQ:
                        self.send_packet("ACK", recv_data)
                        self._log("Received heartbeat frame.")
                        continue

                self.send_packet("DATA", recv_data)

            except Exception as e:
                self._log(f"Error receiving data: {repr(e)}")
                self.send_packet("DISCONNECTED", b'')
                break

        self.cleanup_connection()

    def cleanup_connection(self):
        self.thread_run = False
        if self.client_socket:
            try: self.client_socket.close()
            except: pass
            self.client_socket = None
        self._log("Client connection cleaned up.")

    def disconnect_t95(self):
        self.thread_run = False
        if self.client_socket:
            try: self.client_socket.close()
            except: pass
            self.client_socket = None
        if self.server_sock:
            try: self.server_sock.close()
            except: pass
            self.server_sock = None
        self._log("Bluetooth server socket closed.")

    def start_bt_server(self):
        while True:
            try:
                self.server_sock = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
                self.server_sock.bind(("", bluetooth.PORT_ANY))
                self.server_sock.listen(1)

                self.port = self.server_sock.getsockname()[1]
                bluetooth.advertise_service(self.server_sock, "server", T95_BT_SERIAL_SERVICE)

                self._log(f"Waiting for connection on RFCOMM channel {self.port}")
                sys.stdout.flush()

                self.client_socket, self.client_info = self.server_sock.accept()

                self._log(f"Connected to {self.client_info[0]}")
                self.send_packet("CONNECTED", b'')

                self.thread_run = True
                self.thread = threading.Thread(target=self.bt_recv_thread, name="bt_recv", daemon=True)
                self.thread.start()

                # 等待接收线程结束（断开）后再进行下一轮监听
                self.thread.join()
                self._log("Receive thread ended. Restarting listener...")

            except Exception as e:
                self._log(f"Error in start_bt_server loop: {e}")
                time.sleep(1)
            finally:
                if self.server_sock:
                    try: self.server_sock.close()
                    except: pass
                    self.server_sock = None

    def send_t95(self, msg_data):
        try:
            self.client_socket.send(msg_data)
            self._log(f"Sent data: {msg_data.hex()}")
        except Exception as e:
            self._log(f"Error sending data: {e}")

    def listen_for_commands(self):
        while True:
            try:
                header = sys.stdin.buffer.read(16)
                if len(header) < 16:
                    self._log(f"Incomplete header: {len(header)} bytes")
                    continue

                total_len = int.from_bytes(header[8:16], 'big')
                payload_len = total_len - 16
                if payload_len <= 0:
                    self._log("Invalid payload length.")
                    continue

                payload = sys.stdin.buffer.read(payload_len)
                if len(payload) < payload_len:
                    self._log(f"Incomplete payload: expected {payload_len}, got {len(payload)}")
                    continue

                full_data = header + payload
                self._log(f"Received full frame: {full_data.hex()}")
                self.send_t95(full_data)

            except Exception as e:
                self._log(f"Error in listen_for_commands: {e}")
                time.sleep(0.1)

if __name__ == '__main__':
    t95_bt = T95_BT()

    # 启动命令监听线程（守护线程）
    command_thread = threading.Thread(target=t95_bt.listen_for_commands, daemon=True)
    command_thread.start()

    # 启动服务监听循环
    try:
        t95_bt.start_bt_server()
    except KeyboardInterrupt:
        t95_bt._log("KeyboardInterrupt: shutting down...")
        t95_bt.disconnect_t95()
