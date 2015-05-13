import random
from PokerAI import PokerAI

class RandomAI(PokerAI):
	def gameOver(self):
		self.respond.joinGame()

	def yourTurn(self):
		decisions = [
			self.respond.call,
			self.respond.fold,
			self.respond.bet,
			self.respond.check,
			self.respond.allIn
		]
		random.choice(decisions)()

	def win(self, chips):
		print 'I WON ' + str(chips)

	def deal(self, cards):
		print cards

	def flop(self, cards):
		print cards

	def roundOver(self, card):
	    print card


ai = RandomAI()
ai.start('ws://localhost:1337')

