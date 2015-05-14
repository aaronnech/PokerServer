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
    'ALL_IN' : 'all-in',
    'CHECK' : 'check',
    'WIN' : 'win',
    'JOIN_GAME' : 'join-game',
    'DEAL' : 'deal',
    'SHOW_CARD' : 'show-card',
    'YOU_ARE' : 'you-are',
    'GAME_STARTED' : 'game-started'
}

class PokerClient(WebSocketClient):
    """ Defines a Poker Websocket client """

    def opened(self):
        """ Called when a socket is opened """
        # Join a game!
        self.send(COMMANDS['JOIN_GAME'] + ':' + self.name)

    def closed(self, code, reason=None):
        print "The server disconnected."

    def received_message(self, m):
        """ Called when a message is recieved from te server """
        # Split the message
        s = str(m)
        left = s.split(':')[0]

        # Route the action to the AI
        if left == COMMANDS['WIN']:
            right = s.split(':')[1]
            self.AI.win(int(right))
        elif left == COMMANDS['GAME_OVER']:
            self.AI.gameOver()
        elif left == COMMANDS['YOUR_TURN']:
            self.AI.yourTurn()
        elif left == COMMANDS['DEAL']:
            right = s.split(':')[1]
            self.AI.deal(right.split(','));
        elif left == COMMANDS['SHOW_CARD']:
            right = s.split(':')[1]
            self.AI.showCard(right);
        elif left in ['fold', 'check', 'call', 'bet', 'all-in']:
            index = s.split(':')
            index = index[len(index) - 1]
            self.AI.playerAction(index, m)
        elif left == COMMANDS['YOU_ARE']:
            right = s.split(':')[1]
            self.AI.identity(right);
        elif left == COMMANDS['GAME_STARTED']:
            right = s.split(':')[1]
            self.AI.gameStart(right);

class Response:
    """ Simple class to wrap responses and pass them on """
    def __init__(self, pokerClient):
        self.client = pokerClient

    def joinGame(self):
        """ Called when we should join a game """
        self.client.send(COMMANDS['JOIN_GAME'] + ':' + self.client.name)

    def fold(self):
        """ Called when we should send FOLD """
        self.client.send(COMMANDS['FOLD'])

    def allIn(self):
        """ Called when we should send ALL IN """
        self.client.send(COMMANDS['ALL_IN'])

    def bet(self, amt=10):
        """ Called when we should send BET """
        self.client.send(COMMANDS['BET'] + ':' + str(amt))

    def check(self):
        """ Called when we should send CHECK """
        self.client.send(COMMANDS['CHECK'])

    def call(self):
        """ Called when we should send CALL """
        self.client.send(COMMANDS['CALL'])

class PokerAI:
    """ Defines the AI Base class. AI implementations should extend this. """
    def start(self, url, name):
        self.ws = PokerClient(url, protocols=['http-only', 'chat'])
        self.ws.AI = self
        self.ws.name = name
        self.respond = Response(self.ws)

        self.ws.connect()
        self.ws.run_forever()

    def gameStart(self, people):
        print people

    def identity(self, id):
        print id

    def gameOver(self):
        print 'game over'

    def yourTurn(self):
        print 'your turn'

    def deal(self, cards):
        print cards

    def playerAction(self, index, action):
        print index

    def showCard(self, card):
        print card

    def win(self, chips):
        print 'win'

