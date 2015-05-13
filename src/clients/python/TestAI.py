import random
from PokerAI import PokerAI

class RandomAI(PokerAI):
	def gameOver(self):
		self.respond.joinGame()

	def yourTurn(self, cards):
		decisions = [
			self.respond.call,
			self.respond.fold,
			self.respond.bet,
			self.respond.check,
			self.respond.allIn
		]
		random.choice(decisions)()

	def win(self):
		print 'I WON!'


ai = RandomAI()
ai.start('ws://localhost:1337')

