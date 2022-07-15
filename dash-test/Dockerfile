FROM node:16

#install tc
RUN apt-get update && apt-get install -y \
    iproute2 sudo netcat

# Set the Chrome repo.
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list
# Install Chrome.
RUN apt-get update && apt-get -y install google-chrome-stable

# # For dash.js v3.1.3
# RUN npm install grunt -g

# # For webgl support for tf lib
# ARG DEBIAN_FRONTEND=noninteractive
# RUN apt-get install -y xorg xserver-xorg xvfb libx11-dev libxext-dev libgles2-mesa

# To test network shaping
RUN apt-get install -y iperf3
