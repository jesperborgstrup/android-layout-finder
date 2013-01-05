import os

images = []

filecount = 0
for root,dir,files in os.walk("."):
	for file in files:
		filecount += 1
		
		if file[-4:] == '.png':
			images.append( file[:-4] )
			
print "Images: %d, files: %d" % ( len (images), filecount )
print "[\"%s\"]" % ( "\",\"".join( images ) )