'use strict';

var $toast = document.getElementById('toast');

function toast(html, type) {
  $toast.innerHTML = html;
  $toast.className = type;
  $toast.style.opacity = 1;
}

function usernameToLink(username) {
  return ('<a target="_blank" href="https://github.com/' + username + '">' + username + '</a>');
}

var FollowersGraph = function() {
  var width = window.innerWidth,
  height = window.innerHeight;

  this._scale = 1;
  this._translate = [0, 0];

  this.color = d3.scale.category20();

  this.force = d3.layout.force()
    .charge(-500)
    .linkDistance(50)
    .gravity(0.5)
    .size([width, height]);

  this.svg = d3.select('body').insert('svg', ':first-child')
    .attr('width', width)
    .attr('height', height);

  this.link = this.svg.selectAll('.link');
  this.node = this.svg.selectAll('.node');

  this._onNodeClickBound = this._onNodeClick.bind(this);

  this.zoom = d3.behavior.zoom()
    .scaleExtent([1, 10])
    .on('zoom', function() {
      this._scale = d3.event.scale;
      this._translate = d3.event.translate;
      this.svg.style('transform', 'scale(' + this._scale + ')');
    }.bind(this));

  this.drag = d3.behavior.drag();

  this.svg.call(this.drag);
  this.svg.call(this.zoom);

  var self = this;

  this.force.on('tick', function() {
    // var q = d3.geom.quadtree(this.node),
    //     i = 0,
    //     n = this.node;

    // this.node.each(function(node) {
    //   q.visit(collide(node));
    // });

    self.link
      .attr('x1', function(d) { return d.source.x + self._translate[0]; })
      .attr('y1', function(d) { return d.source.y + self._translate[1]; })
      .attr('x2', function(d) { return d.target.x + self._translate[0]; })
      .attr('y2', function(d) { return d.target.y + self._translate[1]; });

    self.node
      .attr('transform', function(d) {
        return 'translate(' + (d.x + self._translate[0]) + ',' + (d.y + self._translate[1]) + ')';
      });
  }.bind(this));

  this.usersData = [];
  this.followerLinksData = [];

  this._map = {};
};

FollowersGraph.prototype.render = function () {
  this.force = this.force
    .nodes(this.usersData)
    .links(this.followerLinksData)
    .start();

  this.link = this.link.data(this.followerLinksData);

  this.link
    .enter().insert('line', ':first-child')
    .attr('class', 'edge');

  this.node = this.node.data(this.usersData);

  this.node
    .enter().append('image')
      .attr('xlink:href', function(d) { return d.avatar_url; })
      .attr('class', 'node')
      .attr('width', 32)
      .attr('height', 32)
      .attr('x', -32*0.5)
      .attr('y', -32*0.5)
      .on('click', this._onNodeClickBound);

  this.node.call(this.force.drag);

  this.node.append('title')
    .text(function(d) { return d.login; });
};

FollowersGraph.prototype._onNodeClick = function(d) {
  console.log(d);
  this.addUserByUsername(d.login);
};

FollowersGraph.prototype._addUser = function(user) {
  if (!this._map[user.id]) {
    this._map[user.id] = user;
    this.usersData.push(user);
  }
  return this._map[user.id];
};

FollowersGraph.prototype._addFollowerLink = function(targetUser, sourceUser) {
  targetUser = this._addUser(targetUser);
  sourceUser = this._addUser(sourceUser);

  var exists = this._map[sourceUser.index + '-' + targetUser.index];

  if (!exists) {
    this._map[sourceUser.id + '-' + targetUser.id] = true;
    this.followerLinksData.push({ source: sourceUser, target: targetUser });
  }
};

FollowersGraph.prototype.addUserByUsername = function(username) {
  toast('Fetching followers for ' + usernameToLink(username) + '...', 'progress');
  d3.json('api/users/' + username + '/followers', function(error, result) {
    if (error) return console.warn(error);

    toast('Fetched followers for ' + usernameToLink(username), 'success');

    result.followers.forEach(function(follower) {
      this._addFollowerLink(result.user, follower);
    }.bind(this));

    this.render();
  }.bind(this));
};

function collide(node) {
  var r = node.radius + 10,
      nx1 = node.x - r,
      nx2 = node.x + r,
      ny1 = node.y - r,
      ny2 = node.y + r;
  return function(quad, x1, y1, x2, y2) {
    if (quad.point && (quad.point !== node)) {
      var x = node.x - quad.point.x,
          y = node.y - quad.point.y,
          l = Math.sqrt(x * x + y * y),
          r = node.radius + quad.point.radius;
      if (l < r) {
        l = (l - r) / l * .5;
        node.x -= x *= l;
        node.y -= y *= l;
        quad.point.x += x;
        quad.point.y += y;
      }
    }
    return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
  };
}



var followersGraph = new FollowersGraph();
followersGraph.addUserByUsername('FarhadG');
