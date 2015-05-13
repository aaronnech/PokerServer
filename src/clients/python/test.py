from PokerAI import PokerAI

class MyAI(PokerAI):
	def gameOver(self):
		print "game over"

	def yourTurn(self, cards):
		self.respond.call();

	def win(self):
		print 'win'


ai = MyAI()
ai.start('ws://localhost:1337')

