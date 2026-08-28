import 'package:flutter/material.dart';

class NeotLogo extends StatelessWidget {
  const NeotLogo({super.key, this.size = 40});

  final double size;

  @override
  Widget build(BuildContext context) =>
      CustomPaint(size: Size.square(size), painter: const _NeotLogoPainter());
}

class _NeotLogoPainter extends CustomPainter {
  const _NeotLogoPainter();

  static const olive = Color(0xff365314);

  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 64, size.height / 64);

    final stroke = Paint()
      ..color = olive
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.square
      ..strokeJoin = StrokeJoin.round;

    final cap = Path()
      ..moveTo(11, 16.8)
      ..quadraticBezierTo(10, 17.3, 10, 18)
      ..quadraticBezierTo(10, 18.7, 11, 19.2)
      ..lineTo(30.7, 28.15)
      ..quadraticBezierTo(32, 28.75, 33.3, 28.15)
      ..lineTo(53, 19.2)
      ..quadraticBezierTo(54, 18.7, 54, 18)
      ..quadraticBezierTo(54, 17.3, 53, 16.8)
      ..lineTo(33.3, 7.85)
      ..quadraticBezierTo(32, 7.25, 30.7, 7.85)
      ..close();
    canvas.drawPath(cap, Paint()..color = olive);

    final monogram = Path()
      ..moveTo(18, 50)
      ..lineTo(18, 27)
      ..lineTo(46, 50)
      ..lineTo(46, 27);
    canvas.drawPath(monogram, stroke..strokeWidth = 6);

    final tassel = Path()
      ..moveTo(53, 19)
      ..lineTo(53, 38.5);
    stroke.strokeCap = StrokeCap.round;
    canvas.drawPath(tassel, stroke..strokeWidth = 2.5);
    canvas.drawCircle(const Offset(53, 41), 2.4, Paint()..color = olive);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
