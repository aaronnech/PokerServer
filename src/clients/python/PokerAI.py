# Author: Aaron Nech
#
# Python AI client for WebSocket PokerServer

from ws4py.client.threadedclient import WebSocketClient

# The commands in the poker protocol
COMMANDS = {
    'NOT_STARTED' : 'not-started',
    'NOT_YOUR_TURN' : 'not-your-turn',
    'GAME_OVER' : 'game-over',
    'YOUR_TURN' : 'your-turn',
    'WHAT_WAS_THAT' : 'what-was-that',
    'CALL' : 'call',
    'BET' : 'bet',
    'FOLD' : 'fold',
    'ALL_IN' : 'all_in',
    'CHECK' : 'check',
    'WIN' : 'win',
    'JOIN_GAME' : 'join-game',
    'DEAL' : 'deal',
    'FLOP' : 'flop',
    'ROUND_OVER' : 'round-over'
}


class PokerClient(WebSocketClient):
    """ Defines a Poker Websocket client """

    def opened(self):
        """ Called when a socket is opened """
        # Join a game!
        self.joinGame()

    def closed(self, code, reason=None):
        print "The server disconnected."

    def received_message(self, m):
        """ Called when a message is recieved from te server """
        # Split the message
        s = str(m)
        left = s.split(':')[0]
        print 'debug -- MSG RECIEVED: ' + s

        # Route the action to the AI
        if left == COMMANDS['WIN']:
            right = s.split(':')[1]
            self.AI.win(int(right))
        elif left == COMMANDS['GAME_OVER']:
            self.AI.gameOver()
        elif left == COMMANDS['YOUR_TURN']:
            self.AI.yourTurn()
        elif left == COMMANDS['FLOP']:
            right = s.split(':')[1]
            self.AI.flop(right.split(','));
        elif left == COMMANDS['DEAL']:
            right = s.split(':')[1]
            self.AI.deal(right.split(','));
        elif left == COMMANDS['ROUND_OVER']:
            right = s.split(':')[1]
            self.AI.roundOver(right);

    def joinGame(self):
        """ Called when we should join a game """
        self.send(COMMANDS['JOIN_GAME'])

    def fold(self):
        """ Called when we should send FOLD """
        self.send(COMMANDS['FOLD'])

    def allIn(self):
        """ Called when we should send ALL IN """
        self.send(COMMANDS['ALL_IN'])

    def bet(self, amt=10):
        """ Called when we should send BET """
        self.send(COMMANDS['FOLD'] + ':' + str(amt))

    def check(self):
        """ Called when we should send CHECK """
        self.send(COMMANDS['CHECK'])

    def call(self):
        """ Called when we should send CALL """
        self.send(COMMANDS['CALL'])

class PokerAI:
    """ Defines the AI Base class. AI implementations should extend this. """
    def start(self, url):
        self.ws = PokerClient(url, protocols=['http-only', 'chat'])
        self.ws.AI = self
        self.respond = self.ws
        self.ws.connect()
        self.ws.run_forever()

    def gameOver(self):
        print 'game over'

    def yourTurn(self):
        print 'your turn'

    def deal(self, cards):
        print cards

    def flop(self, cards):
        print cards

    def roundOver(self, card):
        print card

    def win(self, chips):
        print 'win'

