U_KEYS="URB PACE HEAT SEAS DRY MTN WATER DESERT FOREST ARTS OUT NIGHT SOC CIV FAITH COST FAM WALK QUIET DIV".split()
PERSONAS=[
 dict(name='Maya',summary='a 31-year-old freelance illustrator and part-time art teacher, single, renting, frugal-but-not-broke, who hikes on weekends and recharges alone',
  tallies={'E':22,'I':58,'S':19,'N':66,'T':21,'F':60,'J':27,'P':52,'A':14,'T_':30},
  U=dict(zip(U_KEYS,[6,4,4,7,4,7,6,1,9,9,7,4,6,9,2,6,3,8,7,7])),
  career1='CREA',career2='EDU',tags=['ARTSY','MAKER','WELLNESS','OUTDOOR','FARM'],dbs=['NOHEAT','LGBTQ'],pri1='COMMUNITY',pri2='NATURE',showscale='FOREST'),
 dict(name='Daniel',summary='a 42-year-old regional bank operations manager, married with three children, active in his church, who coaches youth baseball and wants a big yard at a fair price',
  tallies={'E':55,'I':24,'S':63,'N':18,'T':57,'F':26,'J':66,'P':15,'A':33,'T_':12},
  U=dict(zip(U_KEYS,[4,6,7,5,4,2,4,1,5,3,4,3,8,2,9,6,10,4,7,3])),
  career1='FIN',career2='HLTH',tags=['FAITH','SPORTS','HISTORY'],dbs=['SCHOOLS','FAITH','NOSNOW'],pri1='COMMUNITY',pri2='COST',showscale='COST'),
 dict(name='Jordan',summary='a 27-year-old remote software engineer, single, who skis 40 days a year, mountain-bikes all summer, likes a lively brewery scene, and will pay a premium to live near big peaks',
  tallies={'E':50,'I':31,'S':30,'N':49,'T':55,'F':25,'J':24,'P':57,'A':35,'T_':11},
  U=dict(zip(U_KEYS,[5,6,4,8,8,10,6,3,6,5,10,6,7,6,1,4,3,6,6,4])),
  career1='REMOTE',career2='TECH',tags=['OUTDOOR','SKI','STARTUP','FOODIE'],dbs=['MOUNTAINS'],pri1='NATURE',pri2='CITY',showscale='OUT'),
]
