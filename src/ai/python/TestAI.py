import random
from PokerAI import PokerAI

class RandomAI(PokerAI):
	def gameStart(self, people):
		""" Called when the game starts, and is passed
			a comma-seperated list of id,name pairs of people
			playing (names cannot have commas) """
		print people

	def gameOver(self):
		""" Called when the game is over """
		# joins another game
		self.respond.joinGame()

	def identity(self, id):
		""" Called when the server identifies us. The given id is our
			unique number in the current game.
		"""
		print id

	def yourTurn(self):
		""" Called when it is our turn. We must respond with an
			action within 20 seconds.
		"""
		decisions = [
			self.respond.call,
			self.respond.fold,
			self.respond.bet,
			self.respond.check,
			self.respond.allIn
		]
		random.choice(decisions)()

	def win(self, chips):
		""" Called when we win chips from a game. The number of chips is given. """
		print 'I WON ' + str(chips)

	def deal(self, cards):
		""" Called when we are delt our two cards.
			The two cards are given as strings such as 'KH' or '7S'
		"""
		print cards

	def playerAction(self, index, action):
		""" Called when any player makes an action (even yourself). The given index
			is the identifier of the player, while the action is the entire message sent
			and will contain the appropriate string such as "fold"
		"""
		print index

	def showCard(self, card):
		""" Called when a card is shown in the community hand, such as when we flop or
			when a betting round ends 
		"""
		print card


ai = RandomAI()
ai.start('ws://45.55.179.213:8080', 'MyIsRandom')

