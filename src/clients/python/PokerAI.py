from ws4py.client.threadedclient import WebSocketClient

COMMANDS = {
    'NOT_STARTED' : 'not-started',
    'NOT_YOUR_TURN' : 'not-your-turn',
    'GAME_OVER' : 'game-over',
    'YOUR_TURN' : 'your-turn',
    'WHAT_WAS_THAT' : 'what-was-that',
    'SUCCESS' : 'success',
    'CALL' : 'call',
    'BET' : 'bet',
    'FOLD' : 'fold',
    'ALL_IN' : 'all_in',
    'CHECK' : 'check',
    'WIN' : 'win',
    'JOIN_GAME' : 'join-game'
}

class PokerClient(WebSocketClient):
    def opened(self):
        self.send(COMMANDS['JOIN_GAME'])

    def closed(self, code, reason=None):
        print "Closed down", code, reason

    def received_message(self, m):
        s = str(m)
        print 'MSG RECIEVED: ' + s
        left = s.split(':')[0] 

        if left == COMMANDS['WIN']:
            self.AI.win()
        elif left == COMMANDS['GAME_OVER']:
            self.AI.gameOver()
        elif left == COMMANDS['YOUR_TURN']:
            right = s.split(':')[1]
            self.AI.yourTurn(right.split(','))

    def fold(self):
        self.send(COMMANDS['FOLD'])

    def allIn(self):
        self.send(COMMANDS['ALL_IN'])

    def bet(self, amt):
        self.send(COMMANDS['FOLD'] + ':' + str(amt))

    def check(self):
        self.send(COMMANDS['CHECK'])

    def call(self):
        self.send(COMMANDS['CALL'])

class PokerAI:
    def start(self, url):
        self.ws = PokerClient(url, protocols=['http-only', 'chat'])
        self.ws.AI = self
        self.respond = self.ws
        self.ws.connect()
        self.ws.run_forever()


    def gameOver(self):
        print "game over"

    def yourTurn(self, cards):
        print cards

    def win(self):
        print 'win'

