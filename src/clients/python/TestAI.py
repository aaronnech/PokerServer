import random
from PokerAI import PokerAI

class RandomAI(PokerAI):
	def gameOver(self):
		self.respond.joinGame()

	def identity(self, id):
		print id

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

	def playerAction(self, index, action):
		print index

	def showCard(self, card):
	    print card


ai = RandomAI()
ai.start('ws://localhost:1337')

